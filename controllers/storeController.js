const mongoose = require("mongoose");
const Store = mongoose.model("Store");
const User = mongoose.model("User");
const multer = require("multer");
const jimp = require("jimp");
const uuid = require("uuid");

const multerOptions = {
    storage: multer.memoryStorage(),
    fileFilter(req, file, next) {
        const isPhoto = file.mimetype.startsWith("image/");
        if (isPhoto) {
            next(null, true);
        } else {
            next({ message: "Invalid file type" }, false);
        }
    }
};

exports.homePage = (req, res) => {
    res.render("index");
};

exports.addStore = (req, res) => {
    res.render("editStore", { title: "Add Store" });
};

exports.upload = multer(multerOptions).single("photo");

exports.resize = async(req, res, next) => {
    // see if there's even a file to resize
    if (!req.file) {
        next();
        return;
    }

    // mimetype: 'image/jpeg'
    const extension = req.file.mimetype.split("/")[1];
    req.body.photo = `${uuid.v4()}.${extension}`;

    // resize
    const photo = await jimp.read(req.file.buffer);
    await photo.resize(800, jimp.AUTO);
    await photo.write(`./public/uploads/${req.body.photo}`);

    // next!
    next();
};

exports.createStore = async(req, res) => {
    req.body.author = req.user._id;

    // by using a strict schema, only the stuff we want will be used
    const store = await new Store(req.body).save();

    // flash lets you send messages to the place where you're trying to end up - flash and then redirect.
    req.flash(
        "success",
        `Successfully created ${store.name}. Care to leave a review?`
    );
    res.redirect(`/store/${store.slug}`);
};

exports.getStoreBySlug = async(req, res) => {
    const store = await Store.findOne({ slug: req.params.slug })
        .populate('author reviews');
    // looks it up based on reference!

    if (!store) return next();

    res.render("store", { title: store.name, store });
}

exports.getStores = async(req, res) => {
    const page = req.params.page || 1;
    const limit = 4;
    const skip = (page * limit) - limit;

    const storesPromise = Store
        .find()
        .skip(skip)
        .limit(limit)
        .sort({ created: 'desc' });

    const countPromise = Store.count();

    const [stores, count] = await Promise.all([storesPromise, countPromise]);
    const pages = Math.ceil(count / limit);

    if(!stores.lengh && skip) {
        req.flash('info', `Hey! You asked for page ${page}, but that doesn't exist. I put you on page ${pages}`);
        res.redirect(`/stores/page/${pages}`);
        return;
    }

    res.render("stores", { title: "Stores", stores, page, pages, count });
};

const confirmOwner = (store, user) => {
    if (!store.author.equals(user._id)) {
        throw Error("You must own a store in order to edit it.");
    }
}

exports.editStore = async(req, res) => {
    // find the store given the id
    const store = await Store.findOne({ _id: req.params.id });

    // confirm they are the owner of the store - an error will be thrown if they're not :D
    confirmOwner(store, req.user);

    // render the edit form so the user can update the store
    res.render("editStore", { title: `Edit ${store.name}`, store });
};

exports.updateStore = async(req, res) => {
    // set the location data to defaults
    req.body.location.type = "Point";

    // find and update store
    const store = await Store.findOneAndUpdate({ _id: req.params.id }, req.body, {
        new: true, // returns new store instead of old one
        runValidators: true
    }).exec();

    // tell them it was updated
    req.flash(
        "success",
        `Successfully updated <strong>${store.name}</strong>. <a href="/stores/${store.slug}">View Store</a>`
    );

    // send them to store page
    res.redirect(`/stores/${store._id}/edit`);
};

exports.getStoresByTag = async(req, res) => {
    const tag = req.params.tag;
    const tagQuery = tag || { $exists: true }

    const tagsPromise = Store.getTagsList();
    const storesPromise = Store.find({ tags: tagQuery });

    const [tags, stores] = await Promise.all([tagsPromise, storesPromise]);

    res.render('tags', { tags, stores, tag, title: 'Tags' });
}

exports.searchStores = async (req, res) => {
    const stores = await Store.find({
        $text:{
            $search: req.query.q   
        }
    }, {
        score: { $meta: 'textScore' }
    }).sort({
        score: { $meta: 'textScore' }
    }).limit(5);
    res.json( stores );
}

exports.mapStores = async (req, res) => {
    const coordinates = [req.query.lng, req.query.lat].map(parseFloat);
    const q = {
        location: {
            $near: {
                $geometry: {
                    type: 'Point',
                    coordinates
                }, 
                $maxDistance: 10000 // in meters, 10km
            }
        }
    }

    const stores = await 
        Store.find(q)
            .select('slug name description location photo')
            .limit(10);  // only select the fields that we need

    res.json(stores);
}

exports.mapPage = (req, res) => {
    res.render('map', {title: 'Map'});
}

exports.heartStore = async (req, res) => {
    // have they liked the store?
    const hearts = req.user.hearts.map(obj => obj.toString());
    const operator = hearts.includes(req.params.id) ? '$pull' : '$addToSet';

    const user = await User
        .findByIdAndUpdate(
            req.user._id, 
            { [operator]: { hearts: req.params.id} }, 
            { new: true }
        );

    res.json(user);
}

exports.getHearts = async (req, res) => {
    const stores = await Store.find({
        _id: { $in: req.user.hearts }
    });
    res.render('stores', { title: 'Hearted Stores', stores });
}

exports.getTopStores = async (req, res) => {
    const stores = await Store.getTopStores();
    //res.json(stores);
    res.render('topStores', { stores, title: 'Top Stores!' });
}