const puppeteer = require('puppeteer');

(async () => {
  const b = await puppeteer.launch();
  const p = await b.newPage();
  await p.goto('https://www.abhibus.com/bus_search/Hyderabad/3/Bangalore/7/27-04-2026/O', {waitUntil: 'networkidle2'});
  const html = await p.evaluate(() => {
    const btn = document.querySelector('a, button');
    let card = btn;
    while(card && card !== document.body) {
      if(card.innerText && card.innerText.includes('₹') && card.offsetHeight > 50) break;
      card = card.parentElement;
    }
    return card ? card.innerHTML : 'No card';
  });
  console.log("HTML START\n" + html + "\nHTML END");
  await b.close();
})();
