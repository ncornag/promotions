
export as namespace mongoupdate;

declare module 'mongo-update' {
    export default function update(a: any, b: any, filter?: any, prefix?: any): any;
}