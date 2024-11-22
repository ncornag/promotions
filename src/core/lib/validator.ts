import tsresult, { type Result } from 'ts-results';
const { Ok, Err } = tsresult;
import { Ajv } from 'ajv';
import { AppError, ErrorCode } from './appError.ts';

export class Validator {
  private server: any;
  private validator;

  constructor(server: any) {
    this.server = server;
    this.validator = new Ajv({
      coerceTypes: 'array',
      useDefaults: true,
      addUsedSchema: false
    });
  }

  validate(schema: any, data: any): Result<any, AppError> {
    let validateFn = this.validator.compile(schema);
    let valid = validateFn(data);
    if (!valid) {
      return Err(
        new AppError(
          ErrorCode.BAD_REQUEST,
          `${validateFn.errors![0].instancePath || '/'} ${validateFn.errors![0].message} ${validateFn.errors![0].params.additionalProperty || ''
          }`
        )
      );
    }
    return Ok(true);
  }
}
