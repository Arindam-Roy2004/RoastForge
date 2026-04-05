import Joi from "joi";

export abstract class BaseDto {
    static schema: Joi.ObjectSchema = Joi.object({});

    static validate(data: any): { errors: string[] | null, value: any } {
        const { error, value } = this.schema.validate(data, {
            abortEarly: false,
            stripUnknown: true
        });

        if (error) {
            const errors = error.details.map((d) => d.message);
            return { errors, value: null };
        }
        return { errors: null, value };
    }
}
