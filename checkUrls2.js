import https from 'https';

const testIds = [
  '1601121141461-9d6647bca1ed', // chains?
  '1573408301131-7292215c0e11',
  '1602757279323-958b9f3fa0a3',
  '1551608625902-8a9d18e596bb',
  '1588444650733-fcb4a8eef500',
  '1515562141207-7a8efdb280f6', // Sets (which was used in seeds, I didn't test this one correctly maybe)
  '1605100804763-247f66126e28',
  '1629224316810-9d8805b95e76'
];

testIds.forEach(id => {
  const u = `https://images.unsplash.com/photo-${id}?w=400`;
  https.get(u, (res) => {
    console.log(`${id} - ${res.statusCode}`);
  }).on('error', e => console.error(e));
});
