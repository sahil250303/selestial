import https from 'https';

const urls = [
  'https://images.unsplash.com/photo-1599643478514-4a4be5f1d0b3?auto=format&fit=crop&q=80&w=400',
  'https://images.unsplash.com/photo-1605100804763-247f66126e28?auto=format&fit=crop&q=80&w=400',
  'https://images.unsplash.com/photo-1611591437281-460bfbe1220a',
  'https://images.unsplash.com/photo-1599643477877-530eb83e2dee',
  'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908'
];

urls.forEach(u => {
  https.get(u, (res) => {
    console.log(`${u} - ${res.statusCode}`);
  }).on('error', e => console.error(e));
});
