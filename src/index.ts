// eslint-disable-next-line max-classes-per-file
import { render } from "velocityjs";
import * as utilCore from "./util";
import * as time from "./util-time";
import * as dynamodb from "./util-dynamodb";
import * as map from "./util-map";
import * as math from "./util-math";

export default class Parser {
  private template: string;

  private internalContext: Context;

  public get stash(): Record<string, any> {
    return this.context?.stash ?? {};
  }

  public get context(): Context {
    return this.internalContext ?? {};
  }

  constructor(template: string) {
    this.template = template;
  }

  /**
   * Resolve as a string
   */
  public resolve(
    context: Context,
    additionalUtil?: object,
    additionalExtensions?: object
  ): any {
    const clonedContext = JSON.parse(JSON.stringify(context));
    if (!clonedContext.stash) clonedContext.stash = {};
    clonedContext.args = clonedContext.arguments;

    const util = {
      ...utilCore,
      time,
      dynamodb,
      map,
      math,
      ...additionalUtil,
    };

    const extensions = { ...additionalExtensions };

    const params = {
      context: clonedContext,
      ctx: clonedContext,
      util,
      utils: util,
      extensions,
    };

    const macros = {
      return(this: { stop(): void }, value: unknown | undefined) {
        this.stop();
        return value !== undefined ? JSON.stringify(value) : "null";
      },
    };

    interface CustomMethodHandler {
        uid: string;
        match: (options: { property: string, context: any }) => boolean;
        resolve: (options: { params: any[] }) => any;
    }
    
    const customMethodHandlers: CustomMethodHandler[] = [
        {
            uid: 'parseInt',
            match: ({ property, context }) => {
                return (typeof context === 'number') && property === 'parseInt';
            },
            resolve: ({ params }) => {
                return parseInt(params[0]);
            },
        }
    ];

    const config = { 
      customMethodHandlers 
    }
  

    const res = render(this.template, params, macros,config);

    // Keep the full context
    this.internalContext = clonedContext;

    // Remove preceding and trailing whitespace
    const resWithoutWhitespace = res
      .replace(/^[\n\s\r]*/, "")
      .replace(/[\n\s\r]*$/, "");

    // Typecast Booleans
    if (res === "false") return false;
    if (res === "true") return true;

    // Typecast Null
    if (res === "null") return null;

    // Typecast Numbers
    // eslint-disable-next-line no-restricted-globals
    if (!isNaN((res as unknown) as number)) return parseFloat(res);

    // Typecast JSON to Object
    try {
      return JSON.parse(res);
      // eslint-disable-next-line no-empty
    } catch (e) {}

    // Return a string otherwise
    return resWithoutWhitespace;
  }
}

export type Context = {
  arguments?: object;
  source?: object;
  result?: object | string;
  identity?: object;
  request?: object;
  info?: object;
  error?: object;
  prev?: object;
  stash?: Record<string, any>;
};

export type velocityParams = { [blockName: string]: boolean };
