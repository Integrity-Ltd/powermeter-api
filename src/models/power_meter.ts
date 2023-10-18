import Joi from "joi";

/**
 * Validate powermeter with Joi
 * 
 * @param power_meter the powermeter object to validate 
 * @returns true if validation successfully done
 */
const validate = (power_meter: object): Joi.ValidationResult => {
    const schema = Joi.object().keys({
        power_meter_name: Joi.string(),
        ip_address: Joi.string().required(),
        port: Joi.number().required(),
        time_zone: Joi.string().required(),
        enabled: Joi.boolean().required(),
    });
    return schema.validate(power_meter);
}

export default { validate };
