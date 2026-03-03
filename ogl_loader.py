import urllib.request

url = "https://cdn.jsdelivr.net/npm/ogl@0.0.32/dist/ogl.umd.js"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req) as response:
        content = response.read().decode('utf-8')
    with open('/home/gil-abreu/CodeCraft Studio/BDN/ogl.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print("OGL downloaded cleanly")
except Exception as e:
    print(f"Error fetching: {e}")
