const WhatsAppButton = () => {
  const phoneNumber = '212777888033';
  const message = 'Bonjour, j\'ai besoin d\'aide concernant la plateforme Marjane Securite.';
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 bg-green-500 hover:bg-green-600 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg hover:shadow-xl transition-all hover:scale-110"
      title="Contacter via WhatsApp"
    >
      <svg viewBox="0 0 32 32" fill="currentColor" className="w-7 h-7">
        <path d="M16.004 0h-.008C7.174 0 0 7.176 0 16c0 3.5 1.128 6.744 3.046 9.378L1.054 31.29l6.118-1.962A15.91 15.91 0 0016.004 32C24.826 32 32 24.822 32 16S24.826 0 16.004 0zm9.334 22.608c-.39 1.1-1.932 2.012-3.186 2.278-.856.18-1.974.324-5.738-1.234-4.818-1.994-7.918-6.882-8.16-7.202-.232-.32-1.95-2.6-1.95-4.96s1.234-3.518 1.672-3.998c.39-.428 1.03-.64 1.644-.64.198 0 .376.01.536.018.438.02.658.046.948.734.362.858 1.246 3.038 1.354 3.26.11.222.184.48.036.77-.138.3-.208.486-.416.748-.208.262-.438.586-.624.786-.208.228-.426.476-.182.934.244.458 1.084 1.786 2.328 2.894 1.598 1.424 2.944 1.864 3.364 2.07.42.208.664.174.908-.104.254-.288 1.082-1.26 1.37-1.694.28-.434.568-.362.958-.216.394.144 2.492 1.176 2.92 1.39.428.216.712.324.818.5.104.178.104 1.028-.286 2.126z"/>
      </svg>
    </a>
  );
};

export default WhatsAppButton;
