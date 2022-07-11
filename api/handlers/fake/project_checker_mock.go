// Code generated by moq; DO NOT EDIT.
// github.com/matryer/moq

package handlers_mock

import (
	"sync"
)

// EndpointProviderMock is a mock implementation of handlers.KeptnControlPlaneEndpointProvider.
//
// 	func TestSomethingThatUsesKeptnControlPlaneEndpointProvider(t *testing.T) {
//
// 		// make and configure a mocked handlers.KeptnControlPlaneEndpointProvider
// 		mockedKeptnControlPlaneEndpointProvider := &EndpointProviderMock{
// 			GetControlPlaneEndpointFunc: func() string {
// 				panic("mock out the GetControlPlaneEndpoint method")
// 			},
// 		}
//
// 		// use mockedKeptnControlPlaneEndpointProvider in code that requires handlers.KeptnControlPlaneEndpointProvider
// 		// and then make assertions.
//
// 	}
type EndpointProviderMock struct {
	// GetControlPlaneEndpointFunc mocks the GetControlPlaneEndpoint method.
	GetControlPlaneEndpointFunc func() string

	// calls tracks calls to the methods.
	calls struct {
		// GetControlPlaneEndpoint holds details about calls to the GetControlPlaneEndpoint method.
		GetControlPlaneEndpoint []struct {
		}
	}
	lockGetControlPlaneEndpoint sync.RWMutex
}

// GetControlPlaneEndpoint calls GetControlPlaneEndpointFunc.
func (mock *EndpointProviderMock) GetControlPlaneEndpoint() string {
	if mock.GetControlPlaneEndpointFunc == nil {
		panic("EndpointProviderMock.GetControlPlaneEndpointFunc: method is nil but KeptnControlPlaneEndpointProvider.GetControlPlaneEndpoint was just called")
	}
	callInfo := struct {
	}{}
	mock.lockGetControlPlaneEndpoint.Lock()
	mock.calls.GetControlPlaneEndpoint = append(mock.calls.GetControlPlaneEndpoint, callInfo)
	mock.lockGetControlPlaneEndpoint.Unlock()
	return mock.GetControlPlaneEndpointFunc()
}

// GetControlPlaneEndpointCalls gets all the calls that were made to GetControlPlaneEndpoint.
// Check the length with:
//     len(mockedKeptnControlPlaneEndpointProvider.GetControlPlaneEndpointCalls())
func (mock *EndpointProviderMock) GetControlPlaneEndpointCalls() []struct {
} {
	var calls []struct {
	}
	mock.lockGetControlPlaneEndpoint.RLock()
	calls = mock.calls.GetControlPlaneEndpoint
	mock.lockGetControlPlaneEndpoint.RUnlock()
	return calls
}