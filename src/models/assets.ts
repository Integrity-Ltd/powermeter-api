import Joi from "joi";

/**
 * Validate powermeter with Joi
 *
 * @param assets the powermeter object to validate
 * @returns true if validation successfully done
 */
const validate = (assets: object): Joi.ValidationResult => {
	const schema = Joi.object().keys({
		asset_name_id: Joi.number().required(),
		channel_id: Joi.number().required(),
	});
	return schema.validate(assets);
};

export default { validate };
