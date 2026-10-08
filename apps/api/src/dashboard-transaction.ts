import type { Prisma } from "./generated/prisma/client.js";

/** Compose owning read ports in the caller's snapshot without opening independent transactions. */
export function transactionalReadPorts<T extends object>(service:T,tx:Prisma.TransactionClient):T {
 const cache=new WeakMap<object,object>();
 const prisma=new Proxy(tx,{get(target,key){if(key==="$transaction")return async(run:(client:Prisma.TransactionClient)=>Promise<unknown>)=>run(tx);const value=Reflect.get(target,key,target);return typeof value==="function"?value.bind(target):value;}});
 const database={prisma};
 const wrap=(target:object):object=>{
  const existing=cache.get(target);if(existing)return existing;
  const proxy=new Proxy(target,{get(original,key,receiver){
   if(key==="database")return database;
   const value=Reflect.get(original,key,receiver);
   if(typeof value==="function")return value.bind(receiver);
   if(value&&typeof value==="object"&&value.constructor?.name.endsWith("Service"))return wrap(value);
   return value;
  }});cache.set(target,proxy);return proxy;
 };
 return wrap(service) as T;
}
