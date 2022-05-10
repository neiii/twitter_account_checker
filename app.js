const puppeteer = require('puppeteer')
const cheerio = require('cheerio')
const csv = require('csv-parser')
const createCsvWriter = require('csv-writer').createObjectCsvWriter
const fs = require('fs')

const accounts = []
const results = []
const csvWriter = createCsvWriter({
  path: 'checked.csv',
  header: [
    { id: 'email', title: 'TWITTER EMAIL' },
    { id: 'username', title: 'TWITTER USERNAME' },
    { id: 'password', title: 'TWITTER PASSWORD' },
    { id: 'terminated', title: 'ACCOUNT TERMINATED?' },
  ],
})

fs.createReadStream('twitter.csv')
  .pipe(csv({}))
  .on('data', (data) => accounts.push(data))
  .on('end', () => main())

async function get_page_data(page, account) {
  await page.goto(`https://twitter.com/${account}`)
  await page.waitForSelector(
    '#react-root > div > div > div.css-1dbjc4n.r-18u37iz.r-13qz1uu.r-417010 > main > div > div > div > div > div > div:nth-child(2) > div > div > div:nth-child(1) > div > div.css-1dbjc4n.r-6gpygo.r-14gqq1x > div > div > div.css-1dbjc4n.r-18u37iz.r-1wbh5a2 > div > div > div > span'
  )
  const content = await page.content()
  return content
}

function parse_page_data(content, account) {
  const $ = cheerio.load(content)
  if ($('div[data-testid=emptyState]').text()) {
    console.log(
      '\x1b[31m',
      `${account.trim()} is terminated | ${$('div[data-testid=emptyState]')
        .text()
        .replace(
          'You’re seeing this warning because there has been some unusual activity from this account. Do you still want to view it?Yes, view profile',
          ''
        )}`
    )
    return true
  } else {
    console.log('\x1b[32m', `${account.trim()} is fine`)
    return false
  }
}

async function flow(page, account) {
  page_content = await get_page_data(page, account)
  terminated = parse_page_data(page_content, account)
  return terminated
}

async function main() {
  const browser = await puppeteer.launch({ headless: true })
  const page = await browser.newPage()
  await page.setViewport({ width: 1920, height: 1080 })
  for (let i = 0; i < accounts.length; i++) {
    terminated = await flow(page, accounts[i]['TWITTER USERNAME'])
    results.push({
      email: accounts[i]['TWITTER EMAIL'],
      username: accounts[i]['TWITTER USERNAME'],
      password: accounts[i]['TWITTER PASSWORD'],
      terminated: terminated,
    })
  }
  csvWriter
    .writeRecords(results)
    .then(() =>
      console.log('\x1b[0m', 'Successfully logged all details in "checked.csv"')
    )
    .then(() => process.exit())
}
