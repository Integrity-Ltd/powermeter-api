import joi from "joi";

/**
 * Validate report request with Joi
 *
 * @param report the report object to validate
 * @returns true if validation successfully done
 */
const validate = (report: object): joi.ValidationResult => {
	const schema = joi.object().keys({
		fromdate: joi.string().isoDate().required(),
		todate: joi.string().isoDate().required(),
		ip: joi.string().ip().required(),
		channel: joi.optional(),
		details: joi.string().regex(/^(hourly|daily|monthly)$/).required(),
		multiplier: joi.optional(),
	});
	return schema.validate(report);
};

export default { validate };
