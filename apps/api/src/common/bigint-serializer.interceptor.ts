import {
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from "@nestjs/common";
import type { Observable } from "rxjs";
import { map } from "rxjs/operators";

/**
 * Parasal alanlar veritabanında ve domain katmanında `bigint` (kuruş)
 * cinsindendir; `JSON.stringify` `bigint`'i serialize edemez ve `number`'a
 * düşürmek büyük tutarlarda hassasiyet kaybettirir. Bu yüzden dönüşüm API
 * sınırında tek noktada yapılır: `bigint` değerler ondalıksız dizgi olarak
 * gönderilir (`12345n` → `"12345"`), istemci de `BigInt(...)` ile kayıpsız
 * geri okur. Modüller kendi serializasyonunu yazmaz.
 */
export function serializeBigInt(value: unknown): unknown {
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(serializeBigInt);
  if (!isPlainObject(value)) return value;
  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value))
    result[key] = serializeBigInt(item);
  return result;
}

/**
 * Yalnızca düz nesneler dolaşılır. `Date`, `Buffer` ve Prisma `Decimal` gibi
 * kendi serializasyonu olan sınıf örnekleri olduğu gibi bırakılır; aksi hâlde
 * alanlarına ayrıştırılıp bozulurlardı.
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null) return false;
  const prototype: unknown = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

@Injectable()
export class BigIntSerializerInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(map(serializeBigInt));
  }
}
