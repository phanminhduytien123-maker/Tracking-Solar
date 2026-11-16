import re

for fname in ['scratch/content_chapter2.py', 'scratch/content_chapter3.py', 'scratch/content_chapter4.py', 'README.md']:
    try:
        with open(fname, 'r', encoding='utf-8') as f:
            text = f.read()
        urls = re.findall(r'https?://[^\s"\'\)]+', text)
        print(f"=== {fname} ===")
        for u in set(urls):
            print("  ", u)
    except Exception as e:
        pass

