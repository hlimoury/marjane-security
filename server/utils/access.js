const DEMO_REGION = 'REGION DEMO';

const isScopedRole = (role) => role === 'region' || role === 'city' || role === 'demo';

const rejectIfDemo = (req, res) => {
  if (req.user?.role === 'demo') {
    res.status(403).json({ message: 'Compte démo : consultation uniquement' });
    return true;
  }
  return false;
};

module.exports = { DEMO_REGION, isScopedRole, rejectIfDemo };
