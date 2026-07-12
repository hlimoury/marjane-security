import json
import os
from typing import Any, Optional

import httpx

MARJANE_API_URL = os.getenv("MARJANE_API_URL", "http://localhost:5000").rstrip("/")


async def _api_get(path: str, token: str, params: Optional[dict] = None) -> Any:
    url = f"{MARJANE_API_URL}{path}"
    headers = {"Authorization": f"Bearer {token}"}
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(url, headers=headers, params=params or {})
        response.raise_for_status()
        return response.json()


async def get_interpellations_stats(
    token: str,
    year: Optional[int] = None,
    month: Optional[int] = None,
    region: Optional[str] = None,
    person_type: Optional[str] = None,
) -> dict:
    params = {}
    if year is not None:
        params["year"] = year
    if month is not None:
        params["month"] = month
    if region:
        params["region"] = region
    if person_type:
        params["personType"] = person_type

    data = await _api_get("/api/dashboard/category/interpellations/subcategories", token, params)

    summary = {
        "total_entrees": data.get("total", 0),
        "nombre_rayons": len(data.get("subCategories", [])),
    }

    stats = data.get("interpellationStats") or {}
    if stats:
        summary["personnes"] = stats.get("totalNombre", 0)
        summary["poursuites_judiciaires"] = stats.get("totalPoursuites", 0)
        summary["valeur_kdh"] = stats.get("totalValeurKdh", 0)
        summary["par_type_personne"] = [
            {
                "type": t.get("name"),
                "entrees": t.get("entries", 0),
                "personnes": t.get("nombre", 0),
                "poursuites": t.get("poursuites", 0),
                "kdh": t.get("valeurKdh", 0),
            }
            for t in stats.get("byTypePersonne", [])
            if t.get("entries", 0) > 0
        ]

    rayons = []
    for sub in data.get("subCategories", [])[:15]:
        rayons.append({
            "rayon": sub.get("name"),
            "entrees": sub.get("count", 0),
            "personnes": sub.get("nombre", 0),
            "poursuites": sub.get("poursuites", 0),
            "kdh": sub.get("valeurKdh", 0),
            "magasins": sub.get("supermarketCount", 0),
        })
    summary["top_rayons"] = rayons

    if rayons:
        top_kdh = max(rayons, key=lambda r: r.get("kdh", 0))
        summary["rayon_plus_kdh"] = top_kdh

    return summary


async def get_dashboard_overview(token: str) -> dict:
    data = await _api_get("/api/dashboard/stats", token)
    instances = data.get("instances", [])

    category_keys = [
        "interpellations_count", "accidents_count", "autres_incidents_count",
        "formations_count", "reclamations_count", "anomalies_count", "controle_rm_count",
    ]
    totals = {k.replace("_count", ""): sum(i.get(k, 0) for i in instances) for k in category_keys}

    regions = {}
    for inst in instances:
        r = inst.get("region", "Inconnu")
        if r not in regions:
            regions[r] = {"instances": 0, "interpellations": 0}
        regions[r]["instances"] += 1
        regions[r]["interpellations"] += inst.get("interpellations_count", 0)

    return {
        "totaux_par_categorie": totals,
        "nombre_instances": len(instances),
        "nombre_magasins": len(data.get("supermarkets", [])),
        "par_region": regions,
        "interpellations_par_rayon": data.get("rayonStats", {}),
    }


async def get_totals(token: str, year: Optional[int] = None, month: Optional[int] = None) -> dict:
    params = {}
    if year is not None:
        params["year"] = year
    if month is not None:
        params["month"] = month
    return await _api_get("/api/dashboard/totals", token, params)


async def execute_tool(name: str, arguments: dict, token: str) -> str:
    args = dict(arguments or {})

    if name == "get_interpellations_stats":
        if "personType" in args and "person_type" not in args:
            args["person_type"] = args.pop("personType")
        try:
            result = await get_interpellations_stats(
                token,
                year=args.get("year"),
                month=args.get("month"),
                region=args.get("region"),
                person_type=args.get("person_type"),
            )
        except httpx.HTTPStatusError as e:
            result = {"error": f"Erreur API ({e.response.status_code}): {e.response.text[:200]}"}
        except Exception as e:
            result = {"error": str(e)}
    elif name == "get_dashboard_overview":
        try:
            result = await get_dashboard_overview(token)
        except httpx.HTTPStatusError as e:
            result = {"error": f"Erreur API ({e.response.status_code}): {e.response.text[:200]}"}
        except Exception as e:
            result = {"error": str(e)}
    elif name == "get_totals":
        try:
            result = await get_totals(token, year=args.get("year"), month=args.get("month"))
        except httpx.HTTPStatusError as e:
            result = {"error": f"Erreur API ({e.response.status_code}): {e.response.text[:200]}"}
        except Exception as e:
            result = {"error": str(e)}
    else:
        result = {"error": f"Outil inconnu: {name}"}

    return json.dumps(result, ensure_ascii=False, indent=2)
