import json


with open('sortedRankings.json') as ifh1:
    sortedRankings = json.load(ifh1)

with open('sortedRankingsCompleted.json') as ifh2:
    sortedRankingsCompleted = json.load(ifh2)


sortedRankings.update(sortedRankingsCompleted)

with open('sortedRankingsAll.json', 'w') as ofh:
    json.dump(sortedRankings, ofh)