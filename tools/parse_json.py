import os
import json

# Try to find game-data.json from multiple possible locations
path = 'game-data.json'
if not os.path.exists(path):
    path = os.path.join(os.path.dirname(__file__), '..', 'data', 'game-data.json')
if not os.path.exists(path):
    path = os.path.join('data', 'game-data.json')

with open(path, 'r') as f:
    data = json.load(f)
    print(json.dumps(data['levels']['principal_office']['furniture'], indent=2))
