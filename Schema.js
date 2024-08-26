const Joi=require("Joi")

module.exports.reviewSchema =Joi.object({
    review:Joi.object({
        rating: Joi.number().required(),
        comment: Joi.string().required(),

    }).required()
});

