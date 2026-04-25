import https from 'https';

const url = 'https://unsplash.com/napi/search/photos?query=jewelry&per_page=10';

https.get(url, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      json.results.forEach(item => {
        console.log(item.id, "-", item.alt_description);
      });
    } catch (e) {
      console.error("Parse error.");
    }
  });
});
