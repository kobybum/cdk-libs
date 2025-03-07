import { describe, expect, it } from 'vitest'
import { ZodError } from 'zod'
import { type AwsPolicyStatementProps, Statement } from './statement'

describe('Statement', () => {
    describe('instantiation and validation', () => {
        it('should create a valid statement with basic properties', () => {
            const props: AwsPolicyStatementProps = {
                Effect: 'Allow',
                Action: 's3:GetObject',
                Resource: 'arn:aws:s3:::example-bucket/*',
            }

            const statement = new Statement(props)
            expect(statement.raw).toEqual(props)
        })

        it('should create a valid statement with array of actions', () => {
            const props: AwsPolicyStatementProps = {
                Effect: 'Allow',
                Action: ['s3:GetObject', 's3:PutObject'],
                Resource: 'arn:aws:s3:::example-bucket/*',
            }

            const statement = new Statement(props)
            expect(statement.raw).toEqual(props)
        })

        it('should create a valid statement with array of resources', () => {
            const props: AwsPolicyStatementProps = {
                Effect: 'Allow',
                Action: 's3:GetObject',
                Resource: ['arn:aws:s3:::example-bucket/*', 'arn:aws:s3:::another-bucket/*'],
            }

            const statement = new Statement(props)
            expect(statement.raw).toEqual(props)
        })

        it('should create a valid statement with Principal', () => {
            const props: AwsPolicyStatementProps = {
                Effect: 'Allow',
                Action: 's3:GetObject',
                Resource: 'arn:aws:s3:::example-bucket/*',
                Principal: {
                    AWS: 'arn:aws:iam::123456789012:user/username',
                },
            }

            const statement = new Statement(props)
            expect(statement.raw).toEqual(props)
        })

        it('should create a valid statement with Condition', () => {
            const props: AwsPolicyStatementProps = {
                Effect: 'Allow',
                Action: 's3:GetObject',
                Resource: 'arn:aws:s3:::example-bucket/*',
                Condition: {
                    StringEquals: {
                        's3:prefix': ['photos', 'documents'],
                    },
                },
            }

            const statement = new Statement(props)
            expect(statement.raw).toEqual(props)
        })

        it('should throw when Effect is invalid', () => {
            const props = {
                Effect: 'Invalid',
                Action: 's3:GetObject',
                Resource: 'arn:aws:s3:::example-bucket/*',
            }

            expect(() => new Statement(props as any)).toThrow(ZodError)
        })

        it('should throw when Action is missing', () => {
            const props = {
                Effect: 'Allow',
                Resource: 'arn:aws:s3:::example-bucket/*',
            }

            expect(() => new Statement(props as any)).toThrow(ZodError)
        })

        it('should throw when Principal has multiple keys', () => {
            const props = {
                Effect: 'Allow',
                Action: 's3:GetObject',
                Resource: 'arn:aws:s3:::example-bucket/*',
                Principal: {
                    AWS: 'arn:aws:iam::123456789012:user/username',
                    Service: 'lambda.amazonaws.com',
                },
            }

            expect(() => new Statement(props as any)).toThrow()
        })

        it('should throw when Condition has invalid operator', () => {
            const props = {
                Effect: 'Allow',
                Action: 's3:GetObject',
                Resource: 'arn:aws:s3:::example-bucket/*',
                Condition: {
                    InvalidOperator: {
                        's3:prefix': 'photos',
                    },
                },
            }

            expect(() => new Statement(props as any)).toThrow(ZodError)
        })
    })
})
