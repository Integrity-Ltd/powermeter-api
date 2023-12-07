import joi from "joi";

/**
 * Validate channel with Joi
 *
 * @param channels the channel object to validate
 * @returns true if validation successfully done
 */
const validate = (channels: unknown) => {
	const schema = joi.object().keys({
		power_meter_id: joi.number().required(),
		channel: joi.number().required(),
		channel_name: joi.string(),
		enabled: joi.boolean().required(),
	});
	return schema.validate(channels);
};

export default { validate };
