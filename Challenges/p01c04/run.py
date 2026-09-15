import random

flag = "KPGS{Erqverpgf_ner_vzcbegrag}"

rand = 10

for i in range(0, len(flag)):
    char = flag[i]

    c_fileName = char + str(rand)

    rand += 1

    n_fileName = flag[(i + 1) % len(flag)] + str(rand)

    file = open(c_fileName + ".php", "w")

    file.write("<?php\n")
    file.write("\theader('Location: /" + n_fileName + ".php', true, 301);\n")
    file.write("\texit;\n")
    file.write("?>")
    file.close()
