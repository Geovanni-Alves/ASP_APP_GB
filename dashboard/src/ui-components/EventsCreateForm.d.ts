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
export declare type EventsCreateFormInputValues = {
    name?: string;
    image?: string;
    link?: string;
    date?: string;
};
export declare type EventsCreateFormValidationValues = {
    name?: ValidationFunction<string>;
    image?: ValidationFunction<string>;
    link?: ValidationFunction<string>;
    date?: ValidationFunction<string>;
};
export declare type PrimitiveOverrideProps<T> = Partial<T> & React.DOMAttributes<HTMLDivElement>;
export declare type EventsCreateFormOverridesProps = {
    EventsCreateFormGrid?: PrimitiveOverrideProps<GridProps>;
    name?: PrimitiveOverrideProps<TextFieldProps>;
    image?: PrimitiveOverrideProps<TextFieldProps>;
    link?: PrimitiveOverrideProps<TextFieldProps>;
    date?: PrimitiveOverrideProps<TextFieldProps>;
} & EscapeHatchProps;
export declare type EventsCreateFormProps = React.PropsWithChildren<{
    overrides?: EventsCreateFormOverridesProps | undefined | null;
} & {
    clearOnSuccess?: boolean;
    onSubmit?: (fields: EventsCreateFormInputValues) => EventsCreateFormInputValues;
    onSuccess?: (fields: EventsCreateFormInputValues) => void;
    onError?: (fields: EventsCreateFormInputValues, errorMessage: string) => void;
    onChange?: (fields: EventsCreateFormInputValues) => EventsCreateFormInputValues;
    onValidate?: EventsCreateFormValidationValues;
} & React.CSSProperties>;
export default function EventsCreateForm(props: EventsCreateFormProps): React.ReactElement;
