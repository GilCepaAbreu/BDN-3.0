import sys

with open('/home/gil-abreu/CodeCraft Studio/BDN/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# I see a bug in fix_final.py where I replaced "export class CircularGalleryApp" with "window.CircularGalleryApp = class CircularGalleryApp"
# That works if you execute it right away, but it seems there was an issue where CircularGalleryApp was still not logged correctly
# Actually, the error is CircularGalleryApp not loaded. Let's look at index.html script block again

print(html[html.find('<!-- Circular Gallery -->'):html.find('<!-- Dome Gallery Modal HTML -->')])

