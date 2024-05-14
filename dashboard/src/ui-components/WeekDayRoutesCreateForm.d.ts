/***************************************************************************
 * The contents of this file were generated with Amplify Studio.           *
 * Please refrain from making any modifications to this file.              *
 * Any changes to this file will be overwritten when running amplify pull. *
 **************************************************************************/

import * as React from "react";
import { GridProps, TextFieldProps } from "@aws-amplify/ui-react";
export declare type EscapeHatchProps = {
    [elementHierarchy: string]: Record<string, unknown>;
} | null;
export declare type VariantValues = {
    [key: string]: string;
};
export declare type Variant = {
    variantValues: VariantValues;
    overrides: EscapeHatchProps;
};
export declare type ValidationResponse = {
    hasError: boolean;
    errorMessage?: string;
};
export declare type ValidationFunction<T> = (value: T, validationResponse: ValidationResponse) => ValidationResponse | Promise<ValidationResponse>;
export declare type WeekDayRoutesCreateFormInputValues = {
    date?: string;
    weekDay?: string;
    vanID?: string;
    kidID?: string;
    Order?: string;
    kidName?: string;
    kidDropOffAddress?: string;
};
export declare type WeekDayRoutesCreateFormValidationValues = {
    date?: ValidationFunction<string>;
    weekDay?: ValidationFunction<string>;
    vanID?: ValidationFunction<string>;
    kidID?: ValidationFunction<string>;
    Order?: ValidationFunction<string>;
    kidName?: ValidationFunction<string>;
    kidDropOffAddress?: ValidationFunction<string>;
};
export declare type PrimitiveOverrideProps<T> = Partial<T> & React.DOMAttributes<HTMLDivElement>;
export declare type WeekDayRoutesCreateFormOverridesProps = {
    WeekDayRoutesCreateFormGrid?: PrimitiveOverrideProps<GridProps>;
    date?: PrimitiveOverrideProps<TextFieldProps>;
    weekDay?: PrimitiveOverrideProps<TextFieldProps>;
    vanID?: PrimitiveOverrideProps<TextFieldProps>;
    kidID?: PrimitiveOverrideProps<TextFieldProps>;
    Order?: PrimitiveOverrideProps<TextFieldProps>;
    kidName?: PrimitiveOverrideProps<TextFieldProps>;
    kidDropOffAddress?: PrimitiveOverrideProps<TextFieldProps>;
} & EscapeHatchProps;
export declare type WeekDayRoutesCreateFormProps = React.PropsWithChildren<{
    overrides?: WeekDayRoutesCreateFormOverridesProps | undefined | null;
} & {
    clearOnSuccess?: boolean;
    onSubmit?: (fields: WeekDayRoutesCreateFormInputValues) => WeekDayRoutesCreateFormInputValues;
    onSuccess?: (fields: WeekDayRoutesCreateFormInputValues) => void;
    onError?: (fields: WeekDayRoutesCreateFormInputValues, errorMessage: string) => void;
    onChange?: (fields: WeekDayRoutesCreateFormInputValues) => WeekDayRoutesCreateFormInputValues;
    onValidate?: WeekDayRoutesCreateFormValidationValues;
} & React.CSSProperties>;
export default function WeekDayRoutesCreateForm(props: WeekDayRoutesCreateFormProps): React.ReactElement;
