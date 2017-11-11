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
    photo: String,
    author: {
        type: mongoose.Schema.ObjectId,
        ref: 'User', // tells mongo that it is supposed to be a reference!
        required: 'You must supply an author.'
    }
}
//,{ toJson: { virtuals: true }, toObject: { virtuals: true }}
);

// define indexes
storeSchema.index({
    name: 'text', 
    description: 'text'
});

storeSchema.index({
    'location': '2dsphere'
});

// sets the slug property to whatever the output of the slug function - making a good URL
// happens BEFORE save
// WOULD PROBABLY BE A GOOD IDEA TO SANITZE THE DATA BEFORE GOING INTO THE DATABASE YO...
storeSchema.pre('save', async function(next) {
    if (!this.isModified('name')) {
        next();
        return;
    }
    this.slug = slug(this.name);

    // find other slugs that might have that same slug
    const slugRegEx = new RegExp(`^(${this.slug})((-[0-9]*$)?)$`, 'i');
    const storesWithSlug = await this.constructor.find({ slug: slugRegEx });

    if (storesWithSlug.length) {
        this.slug = `${this.slug}-${storesWithSlug.length + 1}`;
    }

    next();
});

storeSchema.statics.getTagsList = function() {
    return this.aggregate([
        { $unwind: '$tags' }, // break it down so that each store has only one tag (duplicating stores)
        { $group: { _id: '$tags', count: { $sum: 1 } } }, // group it by tag, and strip the query down to _id (tag name), and count (summing the counts)   
        { $sort: { count: -1 } } // sort by popularity
    ]);
}

storeSchema.statics.getTopStores = function() {
    return this.aggregate([
        // lookup stores, populate reviews
        { $lookup: { from: 'reviews', localField: '_id', foreignField: 'store', as: 'reviews' } },

        // filter for items with more than one review
        { $match: { 'reviews.1': { $exists: true }} },
        
        // add 'average reviews' field
        { 
            $project: { 
                photo: '$$ROOT.photo', 
                name: '$$ROOT.name', 
                reviews: '$$ROOT.reviews',
                slug: '$$ROOT.slug',
                averageRating: { $avg: '$reviews.rating'}
            }
        },
        
        // sort it by new field
        { $sort: { averageRating: -1 } },

        // limit to 10
        { $limit: 10 }
    ]);
}

function autopopulate(next) {
    this.populate('reviews');
    next()
}

storeSchema.pre('find', autopopulate);
storeSchema.pre('findOne', autopopulate);

storeSchema.virtual('reviews', {
    ref: 'Review',          // what model to link?
    localField: '_id',      // what is the field on the Store model?
    foreignField: 'store'   // what field on the review? 
})

module.exports = mongoose.model('Store', storeSchema);