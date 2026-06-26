# DataSource

Le but de ce prompt est de classer les différents non exacts matchs du résultat du script de exact match entre deux sources CFIHOS-UNSPSC.

le résultat est un tableau constitué de 2 colonnes la première les classes de source from et la deuxième les classes de source cible. Il ya aussi un tableau de correspondance de définition de chaque classe.

Le but est que le LLM, classe la ligne par rapport à la compairaison qu'il fait des colonne de la source from et de la source cible contenant les labels des objets.

# a faire

Pour chaque label de chaque colonne le LLM devra aller chercher leur définition dans le tableau des définitions afin de réaliser au mieux la compairaison.

Voici les catégories envisagées pour chaque colonne :

- Exact match IA : Le modèle LLM est sur que les deux lignes ont exactement le meme sens et désigne le même objet, le même concept ou le même service, plus précisement la même chose.

- SubclassOf: La colonne source from est un sous concept de la source cible au sens de la taxonomie/ontologie.

- SubclassOf inversé : La colonne source cible est la sous concept de la colonne source from au sens de la taxonomie/ontologie.

- Not match : les deux n'ont aucun des liens précédents

- Je ne sais pas : laisser au LLM la possibilitée de ne pas savoir pour qu'il ne déclare pas à tort des exacts matchs IA ou des not match alors qu'il n'est pas sur de son choix.

Le LLM devra classer lui même ligne par ligne et ne pas écrire de script pour le faire.
L'ordre des lignes du fichier de résultats sera inchangé il faudra juste ajouter une colonne catégorie IA afin de mettre le classement qu'il fait pour chaque ligne. On ne touche pas les lignes et colonnes déjà présentes et écrites du tableau des non exact match entre la source from et source cible

# Justification

En plus de la colonne "AI Category", ajouter une colonne "AI Category Reason" (juste après) dans le tableau des non exact matchs entre la source from et la source cible contenant une courte justification (1-2 phrases) expliquant pourquoi cette catégorie a été choisie, en se basant sur la comparaison des définitions/sens des deux labels. Cette colonne permet d'évaluer plus facilement la pertinence du classement. Elle suit les mêmes règles que la colonne "AI Category" : les lignes et colonnes existantes du tableau source from et source to restent inchangées.
