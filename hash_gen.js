const bcrypt = require('bcryptjs');
const pass = "FORaminiferans#1";
bcrypt.hash(pass, 10).then(hash => {
    console.log("HASH:", hash);
});
