import {addAttributeOptions} from "../model/column/attribute-service";

/**
 * Will not allow values, that match the string regex or real regex
 */
export function Not(arg: string | Array<string | RegExp> | RegExp |
  {msg: string, args: string | Array<string | RegExp> | RegExp}): Function {

  return (target: any, propertyName: string) =>
    addAttributeOptions(target, propertyName, {
      validate: {
        not: arg
      }
    });
}
