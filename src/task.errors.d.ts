import {TaskErrorTypes} from "./task.errors";

export interface TaskError {
    type: TaskErrorTypes
}
export interface ModuleNotFoundError extends TaskError {
    taskName: string
}
export interface SubtasksNotInConfigError extends TaskError {
    name: string
}
export interface SubtaskNotProvidedError extends TaskError {
    name: string
}
export interface SubtaskWildcardNotAvailableError extends TaskError {
    name: string
}
export interface SubtaskNotFoundError extends TaskError {
    name: string
}
export interface AdaptorNotFoundError extends TaskError {
    taskName: string
}
export interface CBFlagNotFoundError extends TaskError {
    taskName: string
}
export interface CBFlagNotProvidedError extends TaskError {
    taskName: string
}
