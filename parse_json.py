import json

with open('game-data.json', 'r') as f:
    data = json.load(f)
    print(json.dumps(data['levels']['principal_office']['furniture'], indent=2))
