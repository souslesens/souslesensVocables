import fs from "fs";
import path from "path";

// Chemin du dossier contenant les fichiers à renommer
const dossier = './public/vocables/icons/CFIHOS';

// Fonction pour renommer les fichiers
function renommerFichiers(dossier) {
    fs.readdir(dossier, (err, fichiers) => {
        if (err) {
            console.error('Erreur lors de la lecture du dossier:', err);
            return;
        }
        console.log(dossier);
        fichiers.forEach((fichier, index) => {
            const ancienChemin = path.join(dossier, fichier);
            const extension = path.extname(fichier);
            const nouveauNom = fichier.replace('cfihos','CFIHOS');
            const nouveauChemin = path.join(dossier, nouveauNom);

            fs.rename(ancienChemin, nouveauChemin, err => {
                if (err) {
                    console.error(`Erreur lors du renommage de ${ancienChemin}:`, err);
                } else {
                    console.log(`Le fichier ${ancienChemin} a été renommé en ${nouveauChemin}`);
                }
            });
        });
    });
}
renommerFichiers(dossier);