const express = require("express");
const bodyParser = require("body-parser");
const multer = require("multer");
const fs = require("fs");
const {v4: uuid64} = require("uuid");
const bcrypt = require("bcrypt");
const saltRounds = 10;

const app = express();

const dataPath = "./db/fakedb.json";

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static(__dirname));


const storage = multer.diskStorage({
    destination(req, file, cb) {
        cb(null, "./uploads/");
    },
    filename(req, file, cb) {
        const date = `${Date.now()}-${file.originalname}`;
        cb(null, date);
    },
});

const fileFilter = (req, file, cb) => {
    //console.log(file);
    if (req.token && (file.mimetype == "image/png" || file.mimetype == "image/jpeg" ||
        file.mimetype == "image/jpg" || file.mimetype == "image/gif")) {
        cb(null, true);
    } else {
        cb(null, false);
    }
};

app.use(multer({
    storage: storage,
    fileFilter: fileFilter}).single("fileData"));

const getData = (path) => {
    let data = fs.readFileSync(path);
    return JSON.parse(data);
}

const saveData = (data) => {
    let stringifyData = JSON.stringify(data);
    fs.writeFileSync(dataPath, stringifyData);
}

app.post("/users/register", (req, res) => {
    let data = getData(dataPath);
    let id = uuid64();
    let password = req.body.password;
    if (password.length > 6) {
        bcrypt.genSalt(saltRounds, function(err, salt) {
            bcrypt.hash(password, salt, function(err, hash) {
                if (!err) {
                    let newUser = {
                        "id": id,
                        "username": req.body.username,
                        "email": req.body.email,
                        "password": hash,
                        "token": ""
                    };

                    data.users.push(newUser);
                    saveData(data);
                    
                    res.send("200 OK");
                } else {
                    res.sendStatus(401);
                }
            });
        });
    }
});

app.post("/users/login", (req, res) => {
    let data = getData(dataPath);
    let email = data.users.map(element => {
        return element.email;
    });
    let userObj = data.users.find(element => {
        if (element.email == req.body.email) {
            return element;
        }
    });
    
    let indexOfObj = data.users.indexOf(userObj);

    if (email.includes(req.body.email)) {
        bcrypt.compare(req.body.password, userObj.password, function(err, result) {
            if (result) {
                if (!data.users[indexOfObj].token) {
                    let randomToken = uuid64();
                    data.users[indexOfObj].token = randomToken;
                    setTimeout(function() {
                        let tempData = getData(dataPath);
                        tempData.users[indexOfObj].token = "";
                        saveData(tempData);
                        console.log("Done for " + tempData.users[indexOfObj].username);
                    }, 3600000);
                    saveData(data);
                }
                res.status(200).json(userObj);
            } else {
                res.status(400).json({"status": "400", "message": "Invalid password"});
            }
        });
    } else {
        res.send("Invalid email");
    }
})

app.post("/user/upload", (req, res) => {
    let data = getData(dataPath);
    if (!req.token) {
        res.send("Log in");
    } else {    
        let fileData = req.file;
        if (!fileData) {
            return res.status(400).json({"status": "400", "message": "Error: File not found or bad file extention (use jpg/jpeg/gif/png)"});
        }
        let newPhoto = {
            "id": uuid64(),
            "title": req.body.title,
            "path": fileData.path,
            "authorId": req.body.id
        };

        data.photos.push(newPhoto);
        saveData(data);

        res.status(200).json(newPhoto);
    }
});

app.listen(8123, () => console.log("Server started"));
