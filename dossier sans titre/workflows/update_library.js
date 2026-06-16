const fs = require('fs');
const path = require('path');

const soundsDir = path.join(__dirname, 'sounds');
const libraryFile = path.join(__dirname, 'config', 'library.json');
const baseUrl = 'https://raw.githubusercontent.com/kjjedit/SmartTool/main/sounds/';

// On charge l'ancienne bibliothèque si elle existe
let library = [];
if (fs.existsSync(libraryFile)) {
    try { library = JSON.parse(fs.readFileSync(libraryFile, 'utf8')); } 
    catch (e) { console.error("Erreur de lecture du library.json"); }
}

// On lit les fichiers audio
const files = fs.readdirSync(soundsDir).filter(file => file.endsWith('.wav') || file.endsWith('.mp3'));

// On génère la nouvelle liste
const newLibrary = files.map(file => {
    // Le titre est simplement le nom du fichier sans le ".wav"
    const title = file.replace(/\.[^/.]+$/, ""); 
    const encodedUrl = baseUrl + encodeURIComponent(file);
    
    // On vérifie si le son est déjà dans la base
    const existingSong = library.find(item => item.url === encodedUrl || item.title === title);
    
    if (existingSong) {
        return existingSong;
    } else {
        // C'est un nouveau son, on l'ajoute !
        return {
            id: title.toLowerCase().replace(/[^a-z0-9]/g, '_'),
            title: title,
            url: encodedUrl
        };
    }
});

fs.writeFileSync(libraryFile, JSON.stringify(newLibrary, null, 2));
console.log("Bibliothèque mise à jour avec succès !");