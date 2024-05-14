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
export declare type WeekDayRoutesUpdateFormInputValues = {
    date?: string;
    weekDay?: string;
    vanID?: string;
    kidID?: string;
    Order?: string;
    kidName?: string;
    kidDropOffAddress?: string;
};
export declare type WeekDayRoutesUpdateFormValidationValues = {
    date?: ValidationFunction<string>;
    weekDay?: ValidationFunction<string>;
    vanID?: ValidationFunction<string>;
    kidID?: ValidationFunction<string>;
    Order?: ValidationFunction<string>;
    kidName?: ValidationFunction<string>;
    kidDropOffAddress?: ValidationFunction<string>;
};
export declare type PrimitiveOverrideProps<T> = Partial<T> & React.DOMAttributes<HTMLDivElement>;
export declare type WeekDayRoutesUpdateFormOverridesProps = {
    WeekDayRoutesUpdateFormGrid?: PrimitiveOverrideProps<GridProps>;
    date?: PrimitiveOverrideProps<TextFieldProps>;
    weekDay?: PrimitiveOverrideProps<TextFieldProps>;
    vanID?: PrimitiveOverrideProps<TextFieldProps>;
    kidID?: PrimitiveOverrideProps<TextFieldProps>;
    Order?: PrimitiveOverrideProps<TextFieldProps>;
    kidName?: PrimitiveOverrideProps<TextFieldProps>;
    kidDropOffAddress?: PrimitiveOverrideProps<TextFieldProps>;
} & EscapeHatchProps;
export declare type WeekDayRoutesUpdateFormProps = React.PropsWithChildren<{
    overrides?: WeekDayRoutesUpdateFormOverridesProps | undefined | null;
} & {
    id?: string;
    weekDayRoutes?: any;
    onSubmit?: (fields: WeekDayRoutesUpdateFormInputValues) => WeekDayRoutesUpdateFormInputValues;
    onSuccess?: (fields: WeekDayRoutesUpdateFormInputValues) => void;
    onError?: (fields: WeekDayRoutesUpdateFormInputValues, errorMessage: string) => void;
    onChange?: (fields: WeekDayRoutesUpdateFormInputValues) => WeekDayRoutesUpdateFormInputValues;
    onValidate?: WeekDayRoutesUpdateFormValidationValues;
} & React.CSSProperties>;
export default function WeekDayRoutesUpdateForm(props: WeekDayRoutesUpdateFormProps): React.ReactElement;
