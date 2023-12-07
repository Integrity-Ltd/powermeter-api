import joi from "joi";

/**
 * Validate powermeter with Joi
 *
 * @param power_meter the powermeter object to validate
 * @returns true if validation successfully done
 */
const validate = (power_meter: unknown): joi.ValidationResult => {
	const schema = joi.object().keys({
		power_meter_name: joi.string(),
		ip_address: joi.string().required(),
		port: joi.number().required(),
		time_zone: joi.string().required(),
		enabled: joi.boolean().required(),
	});
	return schema.validate(power_meter);
};

export default { validate };
