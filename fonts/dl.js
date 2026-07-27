const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({headless: true, args: ['--no-sandbox']});
  const page = await browser.newPage();
  await page._client().send('Page.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath: './'
  });
  await page.goto('https://www.fontpalace.com/font-download/adventure-subtitles-normal/');
  await page.click('input[value="Download Adventure Subtitles Normal Font"]');
  await page.waitForTimeout(5000);
  await browser.close();
})();
