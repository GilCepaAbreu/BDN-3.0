from PIL import Image
img = Image.open('imagem.png').convert("RGBA")
datas = img.getdata()
newData = []
for item in datas:
    # item is (R, G, B, A)
    # If the pixel is very dark (close to black), make it transparent
    if item[0] < 30 and item[1] < 30 and item[2] < 30:
        newData.append((0, 0, 0, 0))
    else:
        newData.append(item)
img.putdata(newData)
img.save('imagem.png', "PNG")
