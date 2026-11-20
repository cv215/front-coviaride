// Build de production (Vercel). Backend actuel : environnement de test sur Render.
// À remplacer par l'adresse du serveur Oracle une fois le backend complet déployé.
export const environment = {
  production: true,
  apiUrl: 'https://coviaride-gateway-kqwt.onrender.com/api',
  wsUrl: 'wss://coviaride-gateway-kqwt.onrender.com/ws-chat'
};
