const puppeteer = require('puppeteer')
var fs = require('fs')
const util = require('util');
const writeFile = util.promisify(fs.writeFile)



const waitAFewSeconds = async () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(console.log('waited'))
    }, 3000)

  })
}

const waitFor = async (timeToWait) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(console.log('waited'))
    }, timeToWait)

  })
}

const main = async () => {
  const browser = await puppeteer.launch()
  const page = await browser.newPage()
  await page.setViewport({
    width: 1920,
    height: 1080,
    deviceScaleFactor: 1,
  })
  this.tournamentAndPlayers = {}
  await page.goto('https://play.swcpoker.club', { waitUntil: 'networkidle0', timeout: 60000 })

  const [signin, forgot, signup, cancel] = await page.$x('//div[@class="simple-button-content"]')
  await page.screenshot({ path: 'swc1.png' })

  await cancel.click()
  await waitAFewSeconds()

  //await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }),

  await page.screenshot({ path: 'swc2.png' })

  const [lobby_div] = await page.$x('//div[@class="navigation-panel-back-content"]')
  console.log(lobby_div)

  await lobby_div.click()
  //await page.waitForNavigation({ waitUntil: 'networkidle2' }),
  await waitAFewSeconds()
  await page.screenshot({ path: 'swc3.png' })


  const [tournaments_btn] = await page.$x('//div[@class="menu-item-content" and text()="Tournaments"]')
  await tournaments_btn.click()
  await waitAFewSeconds()
  //await page.waitForNavigation({ waitUntil: 'networkidle2' }),

  await page.screenshot({ 'path': 'swc4.png' })

  const runningDivs = await page.$x('//div[@class="panel tournament-line running"]')
  const latRegDivs = await page.$x('//div[@class="panel tournament-line late-registration running"]')

  const tournamentDivs = runningDivs.concat(latRegDivs)


  const cdp = await page.target().createCDPSession();
  await cdp.send('Network.enable');
  await cdp.send('Page.enable');

  const printRequest = response => console.log('request: ', response);
  //const printResponse = response => console.log('response: ', response);

  const parseResponse = (async (response) => {
    response = response.response

    let jsonMatch = response.payloadData.match(/^42\/poker\/,(.+)$/)
    let jsonData1
    let jsonData2
    if (jsonMatch) {
      jsonData1 = JSON.parse(jsonMatch[1])
      jsonData2 = JSON.parse(jsonData1[1])
      console.log("DATA: ")
      console.log(jsonData2)
      if (jsonData2.hasOwnProperty('t') && jsonData2['t'] === 'LobbyTournamentInfo') {
        let tourneyName = jsonData2.info.n
        if (!this.tournamentAndPlayers.hasOwnProperty(tourneyName)) {
          this.tournamentAndPlayers[tourneyName] = {}
        }



        let rawPlayers = jsonData2.players

        rawPlayers.forEach((player) => {

          let playerName = player['player-nick']
          let place = player['place']
          let chips = player['cash']
          let expectedPlace = player['expected-place'] + 1
          let playerRate = player['player-rate']
          let isPro = player['pro']
          if (place < 0) place = player['expected-place']
          if (place >= 0) {
            place = place + 1

            this.tournamentAndPlayers[tourneyName][playerName] = { 'position': place, 'chips': chips, 'expectedPosition': expectedPlace, 'playerRating': playerRate, 'isPro': isPro }

          }


        })


      }
    }
  })

  cdp.on('Network.webSocketFrameReceived', parseResponse); // Fired when WebSocket message is received.
  cdp.on('Network.webSocketFrameSent', printRequest);

  for (let i = 0; i < tournamentDivs.length; i++) {
    console.log("getting tournament info " + i + " of " + tournamentDivs.length)
    let refreshRunning = await page.$x('//div[@class="panel tournament-line running"]')
    let refreshLateReg = await page.$x('//div[@class="panel tournament-line late-registration running"]')
    let refreshDivs = refreshRunning.concat(refreshLateReg)
    let div = refreshDivs[i]
    console.log("clicking on tournament div")
    await div.click()
    await waitFor(10000)
    let [backButton] = await page.$x('//div[@class="navigation-panel-back-content"]')
    await backButton.click()
    console.log("SCRAPED:")
    console.log(this.tournamentAndPlayers)
    await waitFor(3000)

  }
  console.log("END")
  console.log(this.tournamentAndPlayers)
  let tournamentKeys = Object.keys(this.tournamentAndPlayers)
  sortedRankings = {}

  for (let i = 0; i < tournamentKeys.length; i++) {
    let unsorted = []
    let currTournament = this.tournamentAndPlayers[tournamentKeys[i]]
    let playerKeys = Object.keys(currTournament)
    for (let j = 0; j < playerKeys.length; j++) {
      let playerData = currTournament[playerKeys[j]]
      playerData['playerName'] = playerKeys[j]
      unsorted.push(playerData)
    }
    let sorted = unsorted.sort((a, b) => (a.position > b.position ? 1 : -1))
    sortedRankings[tournamentKeys[i]] = sorted

  }


  console.log(sortedRankings)

  await writeFile('./tournamentRankings.json', JSON.stringify(this.tournamentAndPlayers))
  await writeFile('./sortedRankings.json', JSON.stringify(sortedRankings))

  await page.close()
  await browser.close()

}

const runContinuously = async function() {
  while(true) {
    await main()
  }
}

runContinuously()


