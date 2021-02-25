# swc_poker_scraper

scrapes tournament standings from swcpoker.club

## Motivations
I wanted a cool standings widget for my poker tournament streams on Twitch.  https://twtich.tv/cornbl4ster

## How it Works
Points a headless chrome browser at play.swcpoker.club and opens a websocket.  Player statistics are then extracted from the intercepted messages.

## Installation
1. Install node v 15.9.0
2. `git clone https://github.com/dchrostowski/swc_poker_scraper.git`
3. `cd swc_poker_scraper`
4. `npm install`
5. `node main.js`
6. Check `sortedRankings.json` and `tournamentRankings.json`

## Demo
See https://api.dev.proxycrawler.com/swc_tournament_standings


<img src="https://cybergrime.net/swcdemo.png" />
