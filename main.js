const puppeteer = require('puppeteer')
var fs = require('fs')
const util = require('util');
const writeFile = util.promisify(fs.writeFile)

const waitFor = async (timeToWait) => {
  return new Promise((resolve) => {
    console.log("Waiting ", timeToWait / 1000, " seconds...")
    setTimeout(() => {
      resolve(console.log('Finsihed waiting.'))
    }, timeToWait)

  })
}

const main = async (getCompleted) => {

  const printRequest = response => console.log('request: ', response);


  const parseResponse = (async (response) => {
    console.log(response)
    response = response.response

    let jsonMatch = response.payloadData.match(/^42\/poker\/,(.+)$/)
    let jsonData1
    let jsonData2
    if (jsonMatch) {
      jsonData1 = JSON.parse(jsonMatch[1])
      jsonData2 = JSON.parse(jsonData1[1])
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
          let mainPrize = player['main-prize-amount'] / 100
          if (place < 0) place = player['expected-place']
          if (place >= 0) {
            place = place + 1

            this.tournamentAndPlayers[tourneyName][playerName] = { 'position': place, 'chips': chips, 'expectedPosition': expectedPlace, 'playerRating': playerRate, 'isPro': isPro, 'prize': mainPrize }
          }
        })


      }
    }
  })

  const browser = await puppeteer.launch()
  const page = await browser.newPage()
  try {
    await page.setViewport({
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
    })

    this.tournamentAndPlayers = {}

    console.log("Loading play.swcpoker.club...")
    await page.goto('https://play.swcpoker.club', { waitUntil: 'networkidle0', timeout: 60000 })
    const [signin, forgot, signup, cancel] = await page.$x('//div[@class="simple-button-content"]')
    console.log("Navigating to lobby...")
    await cancel.click()
    await waitFor(3000)

    const [lobby_div] = await page.$x('//div[@class="navigation-panel-back-content"]')
    await lobby_div.click()
    await waitFor(3000)


    const [tournaments_btn] = await page.$x('//div[@class="menu-item-content" and text()="Tournaments"]')
    await tournaments_btn.click()
    await waitFor(3000)

    const runningDivs = await page.$x('//div[@class="panel tournament-line running"]')
    const latRegDivs = await page.$x('//div[@class="panel tournament-line late-registration running"]')

    const tournamentDivs = runningDivs.concat(latRegDivs)

    const cdp = await page.target().createCDPSession();
    await cdp.send('Network.enable');
    await cdp.send('Page.enable');

    cdp.on('Network.webSocketFrameReceived', parseResponse); // Fired when WebSocket message is received.
    cdp.on('Network.webSocketFrameSent', printRequest);

    for (let i = 0; i < tournamentDivs.length; i++) {
      let refreshRunning = await page.$x('//div[@class="panel tournament-line running"]')
      let refreshLateReg = await page.$x('//div[@class="panel tournament-line late-registration running"]')

      let refreshDivs = refreshRunning.concat(refreshLateReg)
      let div = refreshDivs[i]
      await div.click()
      await waitFor(5000)
      let [backButton] = await page.$x('//div[@class="navigation-panel-back-content"]')
      await backButton.click()
      await waitFor(5000)

    }


    if (getCompleted) {
      let [statusButton] = await page.$x('//div[@class="tournament-list-header"]/div[contains(@class,"tournament-status")]')
      await statusButton.click()
      await waitFor(2000)
      await statusButton.click()
      await waitFor(2000)
      const completedDivs = await page.$x('//div[@class="tournaments"]//div[@class="panel tournament-line completed"]')

      for (let i = 0; i < completedDivs.length; i++) {
        let refreshCompleted = await page.$x('//div[@class="tournaments"]//div[@class="panel tournament-line completed"]')
        let div = refreshCompleted[i]
        await div.click()
        await waitFor(5000)
        let [backButton] = await page.$x('//div[@class="navigation-panel-back-content"]')
        await backButton.click()
        await waitFor(5000)

      }

    }

    let tournamentKeys = Object.keys(this.tournamentAndPlayers)
    sortedRankings = {}

    for (let i = 0; i < tournamentKeys.length; i++) {
      let unsorted = []
      let currTournament = this.tournamentAndPlayers[tournamentKeys[i]]
      let playerKeys = Object.keys(currTournament)
      let completed = false
      for (let j = 0; j < playerKeys.length; j++) {

        let playerData = currTournament[playerKeys[j]]
        if (playerData.prize > 0) {
          completed = true
        }
        playerData['playerName'] = playerKeys[j]
        simplifiedPlayerData = { 'playerName': playerKeys[j], 'position': playerData.position, 'chips': playerData.chips, 'prize': playerData.prize }
        unsorted.push(simplifiedPlayerData)
      }
      let sorted = unsorted.sort((a, b) => (a.position > b.position ? 1 : -1))
      for (let k = 0; k < sorted.length; k++) {
        let entry = sorted[k]
        if (completed) delete entry.chips
        else delete entry.prize
        sorted[k] = entry
      }

      sortedRankings[tournamentKeys[i]] = sorted

    }

    await writeFile('./tournamentRankings.json', JSON.stringify(this.tournamentAndPlayers))
    await writeFile('./sortedRankings.json', JSON.stringify(sortedRankings))

  }
  catch (err) {
    console.error(err)
  }
  finally {
    await page.close()
    await browser.close()
  }





}

const runContinuously = async function () {
  let getCompleted = false
  if (process.argv[2] === "--get-completed") getCompleted = true
  while (true) {
    await main(getCompleted)

  }
}


runContinuously()

//main()


