import requests

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Referer': 'https://www.fontpalace.com/font-download/adventure-subtitles-normal/',
}

session = requests.Session()
response = session.get('https://www.fontpalace.com/font-download/adventure-subtitles-normal/', headers=headers)

data = {
    'submit': 'Download Adventure Subtitles Normal Font'
}
response = session.post('https://www.fontpalace.com/font-download/adventure-subtitles-normal/', headers=headers, data=data)

with open('font.zip', 'wb') as f:
    f.write(response.content)

print(response.headers.get('Content-Type'))
