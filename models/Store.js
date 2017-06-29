const mongoose = require('mongoose');
const slug = require('slugs');

mongoose.Promise = global.Promise;

const storeSchema = new mongoose.Schema({
    name: {
        type: String, 
        trim: true,
        // instead of passing true/false, you can pass an error message that will be displayed
        required: 'Please enter a store name'
    },
    slug: String,
    description: {
        type: String, 
        trim: true,
    },
    tags: [String],
    created: {
        type: Date,
        default: Date.now
    },
    location: {
        type: {
            type: String, 
            default: 'Point'
        },
        coordinates: [{
            type: Number, 
            required: 'You must supply coordinates'
        }],
        address: {
            type: String,
            required: 'You must supply an address'
        }
    },
    photo: String
});

// sets the slug property to whatever the output of the slug function - making a good URL
// happens BEFORE save
storeSchema.pre('save', async function(next) {
    if(!this.isModified('name')) {
        next();
        return;
    }
    this.slug = slug(this.name);

    // find other slugs that might have that same slug
    const slugRegEx = new RegExp(`^(${this.slug})((-[0-9]*$)?)$`, 'i');
    const storesWithSlug = await this.constructor.find({ slug: slugRegEx });

    if(storesWithSlug.length) {
        this.slug = `${this.slug}-${storesWithSlug.length + 1}`;
    }

    next();
});

storeSchema.statics.getTagsList = function() {
    return this.aggregate([
        { $unwind: '$tags' },                               // break it down so that each store has only one tag (duplicating stores)
        { $group: { _id: '$tags', count: { $sum: 1 } } },   // group it by tag, and strip the query down to _id (tag name), and count (summing the counts)   
        { $sort: { count: -1 } }                            // sort by popularity
    ]);
}

module.exports = mongoose.model('Store', storeSchema);