import './Object';

declare global {
  interface StringConstructor {
    isNullOrEmpty(value: string): boolean;
    stringify(value: any, replacer?: any, space?: string | number): string;
  }
}

function isNullOrEmpty(value: string) {
  return value == null || value === '';
}

function stringify(value: any, replacer?: any, space: string | number = 2) {
  let result: string = null;

  if (value != null) {
    result = value.toString();

    if (result === '[object Object]') {
      result = Object.getName(value);

      if (result === 'Object') {
        try {
          result = JSON.stringify(value, replacer, space);
        }
        catch (e) {
          // console.warn('Attempt to stringify failed');
          // console.log(e);
        }
      }
    }
  }

  return result;
}

String.isNullOrEmpty = Object.fallback(String.isNullOrEmpty, isNullOrEmpty);
String.stringify = Object.fallback(String.stringify, stringify);
