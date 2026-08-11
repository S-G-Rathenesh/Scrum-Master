import re
content = open("index.js", encoding="utf-8").read()
match = re.search(r'https://api\.scrummaster\.rathenesh\.dev[^`\'"]*', content)
print(match.group(0) if match else "No match")
