import joi from "joi";

/**
 * Validate powermeter with Joi
 *
 * @param assets the powermeter object to validate
 * @returns true if validation successfully done
 */
const validate = (assets: object): joi.ValidationResult => {
	const schema = joi.object().keys({
		name: joi.string().required(),
	});
	return schema.validate(assets);
};

export default { validate };
