// Build de production (Vercel). Backend : les 12 microservices tournent sur le PC de développement,
// seule la passerelle est publiée via un tunnel Cloudflare (back-coviaride/local/demarrer.ps1 -Tunnel).
// Tunnel rapide : l'adresse change à chaque relance -> la recopier ici depuis back-coviaride/local/.run/tunnel-url.txt
export const environment = {
  production: true,
  apiUrl: 'https://librarian-sought-active-yes.trycloudflare.com/api',
  wsUrl: 'wss://librarian-sought-active-yes.trycloudflare.com/ws-chat'
};
