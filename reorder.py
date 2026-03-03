import sys

filename = '/home/gil-abreu/CodeCraft Studio/BDN/index.html'
with open(filename, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# indices
idx_gallery_start = 0
idx_categorias_start = 0
idx_categorias_end = 0

for i, line in enumerate(lines):
    if "<!-- Galeria AAMP Style -->" in line:
        idx_gallery_start = i
    if "<!-- SECÇÃO DE CATEGORIAS (TARGET CURSOR) -->" in line:
        idx_categorias_start = i
    if "<!-- CTA Section Animada -->" in line:
        idx_categorias_end = i

print(f"Indices: {idx_gallery_start}, {idx_categorias_start}, {idx_categorias_end}")

# Extrair seções
gallery_lines = lines[idx_gallery_start:idx_categorias_start]
categories_lines = lines[idx_categorias_start:idx_categorias_end]

# Processar as linhas da galeria para dividi-la em duas
part1 = []
part2 = []

# Top half structure:
# <!-- Galeria AAMP Style (Primeira Metade) -->
# <section class="aamp-gallery-section" style="padding-bottom: 40px;">
# <div class="aamp-gallery-container">
# <!-- Coluna Esquerda -->
# <div class="aamp-gallery-column">
#   habitacao2
#   habitacao3
#   habitacao4
# </div>
# <!-- Coluna Direita (com espaçamento em cima estilo staggered) -->
# <div class="aamp-gallery-column" style="margin-top: clamp(6rem, 20vw, 15rem);">
#   habitacao7
#   habitacao8
#   habitacao9
# </div>
# </div>
# </section>

# Bottom half structure:
# <!-- Galeria AAMP Style (Segunda Metade) -->
# <section class="aamp-gallery-section" style="padding-top: 40px;">
# <div class="aamp-gallery-container">
# <!-- Coluna Esquerda -->
# <div class="aamp-gallery-column">
#   habitacao5
#   habitacao6
# </div>
# <!-- Coluna Direita -->
# <div class="aamp-gallery-column" style="margin-top: clamp(3rem, 10vw, 8rem);">
#   habitacao10
#   habitacao11
# </div>
# </div>
# </section>

# Em vez de processar manualmente item por item, vamos apenas construir as strings com o HTML exato 
# e manter as classes e id.

html_part1 = """        <!-- Galeria AAMP Style (Primeira Metade) -->
        <section class="aamp-gallery-section" style="padding-bottom: 40px;">
            <div class="aamp-gallery-container">
                <!-- Coluna Esquerda -->
                <div class="aamp-gallery-column">
                    <div class="aamp-gallery-item" style="width: 90%; margin-right: 10%;">
                        <img src="imagens/arquitetamos/habitacao2.png" alt="Projeto BDN" class="aamp-gallery-img">
                    </div>
                    <div class="aamp-gallery-item" style="width: 85%; margin-left: 15%;">
                        <img src="imagens/arquitetamos/habitacao3.png" alt="Projeto BDN" class="aamp-gallery-img">
                    </div>
                    <div class="aamp-gallery-item" style="width: 100%;">
                        <img src="imagens/arquitetamos/habitacao4.png" alt="Construção BDN" class="aamp-gallery-img">
                    </div>
                </div>
                <!-- Coluna Direita (com espaçamento em cima estilo staggered) -->
                <div class="aamp-gallery-column" style="margin-top: clamp(6rem, 20vw, 15rem);">
                    <div class="aamp-gallery-item" style="width: 100%;">
                        <img src="imagens/arquitetamos/habitacao7.png" alt="Arquitetura BDN" class="aamp-gallery-img">
                    </div>
                    <div class="aamp-gallery-item" style="width: 85%; margin-left: 15%;">
                        <img src="imagens/arquitetamos/habitacao8.png" alt="Arquitetura BDN" class="aamp-gallery-img">
                    </div>
                    <div class="aamp-gallery-item" style="width: 90%; margin-right: 10%;">
                        <img src="imagens/arquitetamos/habitacao9.png" alt="Projeto BDN" class="aamp-gallery-img">
                    </div>
                </div>
            </div>
        </section>

"""

html_part2 = """
        <!-- Galeria AAMP Style (Segunda Metade) -->
        <section class="aamp-gallery-section" style="padding-top: 40px;">
            <div class="aamp-gallery-container">
                <!-- Coluna Esquerda -->
                <div class="aamp-gallery-column">
                    <div class="aamp-gallery-item" style="width: 80%; margin-right: 20%;">
                        <img src="imagens/arquitetamos/habitacao5.png" alt="Construção BDN" class="aamp-gallery-img">
                    </div>
                    <div class="aamp-gallery-item" style="width: 95%; margin-left: 5%;">
                        <img src="imagens/arquitetamos/habitacao6.png" alt="Projeto BDN" class="aamp-gallery-img">
                    </div>
                </div>
                <!-- Coluna Direita -->
                <div class="aamp-gallery-column" style="margin-top: clamp(3rem, 10vw, 8rem);">
                    <div class="aamp-gallery-item" style="width: 80%; margin-left: 20%;">
                        <img src="imagens/arquitetamos/habitacao10.png" alt="Arquitetura BDN" class="aamp-gallery-img">
                    </div>
                    <div class="aamp-gallery-item" style="width: 95%;">
                        <img src="imagens/arquitetamos/habitacao11.png" alt="Construção BDN" class="aamp-gallery-img">
                    </div>
                </div>
            </div>
        </section>

"""

new_lines = lines[:idx_gallery_start] + [html_part1] + categories_lines + [html_part2] + lines[idx_categorias_end:]

with open(filename, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("File updated successfully.")
