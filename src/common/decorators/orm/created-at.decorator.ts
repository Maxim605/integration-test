import { DateTimeTransformer } from "../../transformers";
import { ColumnOptions, CreateDateColumn } from "typeorm";

/**
 * When entity has been created.
 * @param options
 */
export const CreatedAt = (options?: ColumnOptions): PropertyDecorator =>
  CreateDateColumn({
    transformer: new DateTimeTransformer(),
    type: "timestamp with time zone",
    ...(options || {}),
  });
